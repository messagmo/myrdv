-- MyRDV : schéma PostgreSQL (prototype)
-- Source : cahier des charges, sections 6 et 8
-- Utilisation :
--   CREATE DATABASE myrdv;
--   \c myrdv
--   \i schema_myrdv.sql

-- Fuseau horaire local de l'établissement (règle de gestion)
ALTER DATABASE myrdv SET timezone TO 'Africa/Douala';

-- Pour repartir de zéro pendant le développement
DROP TABLE IF EXISTS notification, rendez_vous, creneau, medecin, service, personnel, patient CASCADE;

-- Patient
CREATE TABLE patient (
    id                  SERIAL PRIMARY KEY,
    nom                 VARCHAR(100) NOT NULL,
    prenom              VARCHAR(100) NOT NULL,
    telephone           VARCHAR(20)  NOT NULL UNIQUE,
    email               VARCHAR(150),                -- facultatif
    mot_de_passe_hashe  VARCHAR(255) NOT NULL        -- jamais en clair
);

-- Personnel (administrateur / agent d'accueil)
CREATE TABLE personnel (
    id                  SERIAL PRIMARY KEY,
    nom                 VARCHAR(100) NOT NULL,
    identifiant         VARCHAR(50)  NOT NULL UNIQUE,
    mot_de_passe_hashe  VARCHAR(255) NOT NULL,
    role                VARCHAR(30)  NOT NULL
                        CHECK (role IN ('administrateur', 'agent_accueil'))
);

-- Service
CREATE TABLE service (
    id                  SERIAL PRIMARY KEY,
    nom                 VARCHAR(100) NOT NULL UNIQUE,
    description_courte  VARCHAR(255),
    statut              VARCHAR(10)  NOT NULL DEFAULT 'actif'
                        CHECK (statut IN ('actif', 'inactif'))
);

-- Médecin
CREATE TABLE medecin (
    id          SERIAL PRIMARY KEY,
    nom         VARCHAR(100) NOT NULL,
    service_id  INTEGER NOT NULL REFERENCES service(id),
    statut      VARCHAR(10) NOT NULL DEFAULT 'actif'
                CHECK (statut IN ('actif', 'inactif'))
);

-- Créneau
CREATE TABLE creneau (
    id           SERIAL PRIMARY KEY,
    medecin_id   INTEGER NOT NULL REFERENCES medecin(id),
    date         DATE NOT NULL,
    heure_debut  TIME NOT NULL,
    heure_fin    TIME NOT NULL,
    statut       VARCHAR(15) NOT NULL DEFAULT 'disponible'
                 CHECK (statut IN ('disponible', 'indisponible')),
    CHECK (heure_fin > heure_debut),
    UNIQUE (medecin_id, date, heure_debut)
);

-- Rendez-vous
CREATE TABLE rendez_vous (
    id             SERIAL PRIMARY KEY,
    patient_id     INTEGER NOT NULL REFERENCES patient(id),
    medecin_id     INTEGER NOT NULL REFERENCES medecin(id),
    creneau_id     INTEGER NOT NULL REFERENCES creneau(id),
    statut         VARCHAR(15) NOT NULL DEFAULT 'en_attente'
                   CHECK (statut IN ('en_attente', 'confirme', 'refuse', 'annule')),
    date_creation  TIMESTAMPTZ NOT NULL DEFAULT now(),
    motif_demande  VARCHAR(255),   -- facultatif, non sensible (saisi par le patient)
    motif_decision VARCHAR(30)     -- motif bref d'un refus ou d'une annulation (liste fermée, non médicale)
                   CHECK (motif_decision IN ('medecin_indisponible', 'demande_incomplete', 'autre'))
);

-- Règle de gestion : un créneau ne peut pas être confirmé pour deux patients.
-- Un rendez-vous annulé ou refusé ne bloque donc plus le créneau.
CREATE UNIQUE INDEX uniq_creneau_confirme
    ON rendez_vous (creneau_id)
    WHERE statut = 'confirme';

-- Notification (traçabilité des SMS)
CREATE TABLE notification (
    id                    SERIAL PRIMARY KEY,
    rendez_vous_id        INTEGER NOT NULL REFERENCES rendez_vous(id) ON DELETE CASCADE,
    type                  VARCHAR(15) NOT NULL
                          CHECK (type IN ('confirmation', 'rappel', 'refus', 'annulation')),
    statut_envoi          VARCHAR(15) NOT NULL
                          CHECK (statut_envoi IN ('reussite', 'echec', 'simulation')),
    date_tentative        TIMESTAMPTZ NOT NULL DEFAULT now(),
    reference_fournisseur VARCHAR(100)               -- facultative
);

-- Index utiles pour les recherches (date, médecin, statut)
CREATE INDEX idx_creneau_medecin_date ON creneau (medecin_id, date);
CREATE INDEX idx_rdv_patient ON rendez_vous (patient_id);
CREATE INDEX idx_rdv_statut ON rendez_vous (statut);
