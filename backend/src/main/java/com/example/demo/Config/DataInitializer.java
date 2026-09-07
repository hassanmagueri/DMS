package com.example.demo.Config;

import com.example.demo.Model.Entity.Enums.UserRole;
import com.example.demo.Model.Entity.Enums.UserStatus;
import com.example.demo.Model.Entity.User;
import com.example.demo.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    CommandLineRunner initAdmin() {
        return args -> {

            if (userRepository.findByEmail("admin@example.com").isEmpty()) {

                User admin = new User();

                admin.setUsername("admin");
                admin.setEmail("admin@example.com");
                admin.setPassword(
                        passwordEncoder.encode("admin")
                );
                admin.setRole(UserRole.ADMIN);
                admin.setEnabled(true);
                admin.setFirstName("Admin");
                admin.setLastName("User");
                admin.setPhone("1234567890");
                admin.setStatus(UserStatus.ACTIVE);
                userRepository.save(admin);

                // add simple customer
                User customer = new User();
                customer.setUsername("customer");
                customer.setEmail("customer@gmail.com");
                customer.setPassword(
                        passwordEncoder.encode("customer")
                );
                customer.setRole(UserRole.CUSTOMER);
                customer.setEnabled(true);
                customer.setFirstName("Customer");
                customer.setLastName("User");
                customer.setPhone("1234567891");
                customer.setStatus(UserStatus.ACTIVE);
                userRepository.save(customer);

                // add dispatcher

                User dispatcher = new User();
                dispatcher.setUsername("dispatcher");
                dispatcher.setEmail("dispatcher@gmail.com");
                dispatcher.setStatus(UserStatus.ACTIVE);
                dispatcher.setPassword(
                        passwordEncoder.encode("dispatcher")
                );
                dispatcher.setRole(UserRole.DISPATCHER);
                dispatcher.setEnabled(true);
                dispatcher.setFirstName("Dispatcher");
                dispatcher.setLastName("User");
                dispatcher.setPhone("1234567892");
                userRepository.save(dispatcher);

            }
        };
    }
}
