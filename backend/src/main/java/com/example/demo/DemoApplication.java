package com.example.demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

//    @Bean
//    CommandLineRunner init(RoleRepository roleRepository) {
//        return args -> {
//            if (roleRepository.count() == 0) {
//                roleRepository.save(new Role(null, "ROLE_ADMIN"));
//                // roleRepository.save(new Role(null, "ROLE_DRIVER"));
//                roleRepository.save(new Role(null, "ROLE_CUSTOMER"));
//                roleRepository.save(new Role(null, "ROLE_DISPATCHER"));
//            }
//        };

 }
