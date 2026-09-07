package com.example.demo.Service.impl;

import com.example.demo.Exception.Custom.UserNotFoundException;
import com.example.demo.Mapper.UserMapper;
import com.example.demo.Model.Dto.CreateUserDto;
import com.example.demo.Model.Dto.ResponseUserDto;
import com.example.demo.Model.Dto.ResponseUserPublicDto;
import com.example.demo.Model.Dto.UpdateUserDto;
import com.example.demo.Model.Entity.Enums.UserRole;
import com.example.demo.Model.Entity.Enums.UserStatus;
import com.example.demo.Model.Entity.User;
import com.example.demo.Repository.UserRepository;
import com.example.demo.Service.DispatcherService;
import com.example.demo.Service.UserService;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DispatcherServiceImpl implements DispatcherService {
    private final UserMapper userMapper;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final UserService userService;

    @Override
    public ResponseUserDto create(CreateUserDto dispatcher) {
        User user = userMapper.toEntity(dispatcher);
        user.setEnabled(true);
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(UserRole.DISPATCHER);
        user.setPassword(passwordEncoder.encode(dispatcher.getPassword()));
        user = userRepository.save(user);
        return userMapper.toResponseDto(user);
    }


    @Override
    public ResponseUserPublicDto update(Long id, UpdateUserDto dispatcher) {
        return userService.updateUser(id, dispatcher, UserRole.DISPATCHER);
//        return userMapper.toResponsePublicDto(user);
    }

    @Override
    public void delete(Long id) {
        userService.deleteUser(id, UserRole.DISPATCHER);
    }

    @Override
    public List<ResponseUserPublicDto> getAllDispatchers() {
        return userService.getAllUsersWithRole(UserRole.DISPATCHER);
    }
}
