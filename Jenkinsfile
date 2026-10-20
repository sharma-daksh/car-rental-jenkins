pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                bat 'mvnw.cmd -B clean compile'
            }
        }

        stage('Unit Tests') {
            steps {
                bat 'mvnw.cmd -B test'
            }
        }

        stage('Package') {
            steps {
                bat 'mvnw.cmd -B package -DskipTests'
            }
        }

        stage('Deploy') {
            steps {
                bat 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\deploy-local.ps1'
            }
        }

        stage('Health Check') {
            steps {
                bat 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\health-check.ps1'
            }
        }
    }

    post {
        success {
            archiveArtifacts artifacts: 'target/*.jar', fingerprint: true
            echo 'Build, tests, packaging, deployment and HTTP availability check completed.'
        }
        failure {
            echo 'Pipeline failed. Review the failed stage and Console Output.'
        }
    }
}
