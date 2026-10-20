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
    }

    post {
        success {
            archiveArtifacts artifacts: 'target/*.jar', fingerprint: true
            echo 'Build, tests and packaging completed successfully.'
        }
        failure {
            echo 'Pipeline failed. Check the failed stage in Console Output.'
        }
    }
}
