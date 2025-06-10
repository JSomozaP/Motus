CREATE DATABASE motus;
USE motus;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pseudo VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    numero_secu VARCHAR(15) UNIQUE
);

CREATE TABLE wall_of_fame (
    id INT PRIMARY KEY AUTO_INCREMENT,
    scores INT NOT NULL,
    login VARCHAR(50),
    FOREIGN KEY (login) REFERENCES users(pseudo)
);

CREATE TABLE mots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    word VARCHAR(20) NOT NULL,
    longueur INT NOT NULL,
    difficulte ENUM('facile', 'moyen', 'difficile') NOT NULL
);

CREATE TABLE parties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    mot_id INT NOT NULL,
    nb_tentatives INT NOT NULL,
    score INT,
    status ENUM('en_cours', 'gagnee', 'perdue') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (mot_id) REFERENCES mots(id)
);