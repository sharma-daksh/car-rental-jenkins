FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

COPY target/car-rental-jenkins-0.0.1-SNAPSHOT.jar app.jar

RUN mkdir -p /app/data

ENV SPRING_PROFILES_ACTIVE=demo

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "/app/app.jar", "--server.address=0.0.0.0", "--spring.datasource.url=jdbc:h2:file:/app/data/car-rental-db;DB_CLOSE_ON_EXIT=FALSE"]
