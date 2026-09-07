package com.example.demo.Controller;

import com.example.demo.Model.Dto.CreateUserDto;
import com.example.demo.Model.Dto.ResponseUserDto;
import com.example.demo.Model.Entity.User;
import com.example.demo.Service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@AllArgsConstructor
@RequestMapping("/api/users/")
public class UserController {
    UserService userService;

    @PostMapping
    public ResponseUserDto createUser(@RequestBody @Valid CreateUserDto createUserDto) {
        System.out.println("Received request to create user: " + createUserDto);
        return userService.create(createUserDto);
//        return "user created";
    }

//    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}")
    public ResponseUserDto getUserById(
            @PathVariable Long id,
           Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();
        System.out.println("USER_CONTROLLER:Current user: " + currentUser);

        if (!currentUser.getId().equals(id)) {
            throw new AccessDeniedException("You cannot access this user");
        }
        return userService.getUserByID(id);
    }


    @GetMapping("/me")
    public ResponseUserDto getUser(Authentication authentication)
    {
//        User reqUser = (User) authentication.getPrincipal();
            if (!(authentication.getPrincipal() instanceof User user))
                throw new IllegalStateException("Invalid authentication principal");
//        System.out.println();

        return userService.getUserByID(user.getId());
    }


    @DeleteMapping("/me")
    public ResponseEntity<String> DeleteUser(Authentication authentication){
        if (!(authentication.getPrincipal() instanceof User user))
            throw new IllegalStateException("Invalid authentication principal");
        userService.deleteUser(user.getId());
        return ResponseEntity.ok("delete successfully");
    }


    @PutMapping("/me")
    public ResponseEntity<ResponseUserDto> updateUser(@RequestBody CreateUserDto user, Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof User authUser))
            throw new IllegalStateException("Invalid authentication principal");
//        userService.updateUser(authUser.getId());
        return ResponseEntity.status(201).body(userService.updateUser(authUser.getId(), user));
    }
}
