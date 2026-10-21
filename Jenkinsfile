pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                bat 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\build-frontend.ps1'
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

        stage('Selenium UI Tests') {
            steps {
                bat 'mvnw.cmd -B -f selenium\\pom.xml test "-Dapp.baseUrl=http://127.0.0.1:8081"'
            }
        }
    }

    post {
        always {
            junit testResults: 'selenium/target/surefire-reports/TEST-*.xml',
                  allowEmptyResults: true
        }

        success {
            archiveArtifacts artifacts: 'target/*.jar', fingerprint: true
            echo 'Frontend build, backend tests, deployment and Selenium tests completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Check Console Output and the Selenium test report.'
        }
    }
}

