pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
        disableConcurrentBuilds()
    }

    triggers {
        pollSCM('H/5 * * * *')
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

        stage('Docker Build and Publish') {
            steps {
                bat '''
                    docker version
                    if errorlevel 1 exit /b 1

                    docker build -t localhost:5000/car-rental-jenkins:%BUILD_NUMBER% .
                    if errorlevel 1 exit /b 1

                    docker tag localhost:5000/car-rental-jenkins:%BUILD_NUMBER% localhost:5000/car-rental-jenkins:latest
                    if errorlevel 1 exit /b 1

                    docker push localhost:5000/car-rental-jenkins:%BUILD_NUMBER%
                    if errorlevel 1 exit /b 1

                    docker push localhost:5000/car-rental-jenkins:latest
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Deploy Docker Container') {
            steps {
                bat 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\deploy-docker.ps1 -ImageTag %BUILD_NUMBER%'
            }
        }

        stage('Docker Health Check') {
            steps {
                bat 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\docker-health-check.ps1'
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
            echo 'Build, unit tests, local deployment, Selenium tests and Docker deployment completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Check Console Output and the failed stage before proceeding.'
        }
    }
}
