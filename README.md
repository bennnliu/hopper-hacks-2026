# Solana Integrated Zombie Shooter
A project made for the Hopper Hacks 2026 Hackathon 
Frameworks/Libraries: React-Vite, Tailwindcss , Django, Phaser, Devnet

---
# Clone Repo + Intial Setup
* Make sure git is installed: [git-install](https://git-scm.com/install/)
* Inside your repositories folder or any folder you want to store your project, open the terminal
* Inside your terminal run this command:
    ```bash
    git clone https://github.com/bennnliu/hopper-hacks-2026
    ```
Your project should have the latest commit and is now ready for environment setup
---
# React + Vite Setup Guide

This guide outlines the steps to setup a fast, modern React development environment using Vite and Node.js.

Ensure you have Node.js installed on your machine.
* Download Node.js: [nodejs.org](https://nodejs.org/)
* If already downloaded or just finished downloading, verify your installation by running the following commands in your terminal:

  ```bash 
  node -v
  npm -v 
  ```
* Look for [frontend/package.json](frontend/package.json)
* To ensure all packages are downloaded, run this command in your terminal:

    ```bash
    cd frontend
    npm install
    ```
* Run the development server command in your terminal:

    ```bash
    npm run dev
    ```
If there are no errors, then your frontend environment is setup.
---
# Django Setup Guide

This guide outlines the steps to setup an development environment using Django.

Ensure python is installed on your machine
* Download python latest version: [python.org](https://www.python.org/downloads/)
* If already downloaded or just finished downloading, verify your installation by running the following commands in your terminal:

    ```bash
    python --version
    ```
* To ensure all packages are downloaded, run this command in your terminal:

    ```bash
    cd backend
    pip install -r requirements.txt
* Run the development server command in your terminal:

    ```bash
    python manage.py runserver
    ```
If there are no errors, then your backend enviroment is setup.