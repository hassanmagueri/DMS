package com.example.demo.Repository;

import com.example.demo.Model.Entity.Enums.UserRole;
import com.example.demo.Model.Entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<Object> findByEmail(@NotBlank(message = "Email is required") @Email(message = "Email must be valid") @Size(max = 100, message = "Email must not exceed 100 characters") String email);

    Optional<User> findByUsername(String username);

    Optional<User> findByIdAndRole(Long id, UserRole role);

    List<User> findAllByRole(UserRole role);

    UserRole Role(UserRole role);

    Boolean existsByIdAndRole(Long id, UserRole role);

}
