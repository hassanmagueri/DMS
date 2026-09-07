package com.example.demo.Service;

import com.example.demo.Model.Dto.*;
import com.example.demo.Model.Entity.Enums.UserRole;
import com.example.demo.Model.Entity.User;
import jakarta.validation.Valid;

import java.util.List;

public interface UserService {
    ResponseUserDto create(CreateUserDto createUserDto);

    User getUserById(Long userId);

    ResponseUserDto getUserByID(Long userId);

    ResponseUserDto createDispatcher(@Valid CreateUserDto dispatcher);

    ResponseUserDto createDriver(@Valid CreateUserDto dispatcher);

    void   deleteUser(Long id);

    ResponseUserDto updateUser(Long id, CreateUserDto user);

    ResponseUserPublicDto updateUser(Long id, UpdateUserDto user, UserRole role);

    List<ResponseUserPublicDto> getAllUsersWithRole(UserRole role);

    List<ResponseUserPublicDto> getAllUsers();

    void deleteUser(Long id, UserRole userRole);
}
