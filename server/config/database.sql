CREATE DATABASE IF NOT EXISTS motus;
USE motus;

-- Table des utilisateurs (mise à jour avec email et champs sécurisés)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pseudo VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    numero_secu VARCHAR(15) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des mots avec niveaux de difficulté
CREATE TABLE IF NOT EXISTS mots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    word VARCHAR(20) NOT NULL,
    longueur INT NOT NULL,
    difficulte ENUM('facile', 'moyen', 'difficile') NOT NULL
);

-- Table des parties (mise à jour avec contraintes appropriées)
CREATE TABLE IF NOT EXISTS parties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    mot_id INT NOT NULL,
    nb_tentatives INT NOT NULL,
    score INT DEFAULT 0,
    status ENUM('en_cours', 'gagnee', 'perdue') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mot_id) REFERENCES mots(id) ON DELETE CASCADE
);

-- Table des scores/performances (nouvelle)
CREATE TABLE IF NOT EXISTS scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    partie_id INT NOT NULL,
    score INT DEFAULT 0,
    tentatives_utilisees INT NOT NULL,
    temps_ecoule INT DEFAULT 0, -- en secondes
    mot_longueur INT NOT NULL,
    status ENUM('gagnee', 'perdue') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (partie_id) REFERENCES parties(id) ON DELETE CASCADE
);

-- Table wall_of_fame (mise à jour avec références correctes)
CREATE TABLE IF NOT EXISTS wall_of_fame (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    score INT NOT NULL,
    partie_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (partie_id) REFERENCES parties(id) ON DELETE SET NULL
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at);
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_parties_user_id ON parties(user_id);
CREATE INDEX IF NOT EXISTS idx_parties_status ON parties(status);
CREATE INDEX IF NOT EXISTS idx_wall_of_fame_score ON wall_of_fame(score DESC);
CREATE INDEX IF NOT EXISTS idx_mots_difficulte ON mots(difficulte);
CREATE INDEX IF NOT EXISTS idx_mots_longueur ON mots(longueur);

-- Insertion des mots de base (seulement si la table est vide)
INSERT IGNORE INTO mots (word, longueur, difficulte) VALUES
('MAISON', 6, 'facile'),
('JARDIN', 6, 'facile'),
('SOLEIL', 6, 'facile'),
('PLANTE', 6, 'facile'),
('VOITURE', 7, 'moyen'),
('CUISINE', 7, 'moyen'),
('TABLEAU', 7, 'moyen'),
('MUSIQUE', 7, 'moyen'),
('FENETRE', 7, 'moyen'),
('CHAMBRE', 7, 'moyen'),
('BOUQUET', 7, 'moyen'),
('PLATEAU', 7, 'moyen'),
('LUMIERE', 7, 'difficile'),
('JOURNAL', 7, 'difficile'),
('MONTURE', 7, 'difficile'),
('EXEMPLE', 7, 'moyen'),
('PARCOURS', 8, 'difficile'),
('QUESTION', 8, 'difficile'),
('REPONSE', 7, 'moyen'),
('VICTOIRE', 8, 'difficile');

-- Utilisateur de test (mot de passe: 'test123')
-- Hash bcrypt de 'test123' avec salt rounds 12
INSERT IGNORE INTO users (pseudo, email, password) VALUES 
('testuser', 'test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewJJOyLGJGhCdJGG');