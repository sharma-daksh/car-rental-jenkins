package com.carrental.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * LOCAL-DEMO ONLY. The demo profile is bound to 127.0.0.1 in
 * application-demo.properties so the unauthenticated demo API is not exposed
 * to other devices on the network. Do not use this configuration in production.
 */
@Configuration
@Profile("demo")
public class DemoSecurityConfig {

    @Bean
    SecurityFilterChain demoSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }
}
