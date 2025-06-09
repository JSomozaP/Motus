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