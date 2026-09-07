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
import com.example.demo.Service.UserService;
import lombok.AllArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@AllArgsConstructor
public class UserServiceImpl implements UserService {
    UserMapper userMapper;
    UserRepository userRepository;

    @Override
    public ResponseUserDto create(CreateUserDto createUserDto) {
        System.out.println("UserService: received create user request: " + createUserDto);

        User user = userMapper.toEntity(createUserDto);
//        user.setUsername(createUserDto.getUsername());
        System.out.println("UserService: mapped user: " + user);
        user.setEnabled(false);
        user.setStatus(UserStatus.INACTIVE);
        user.setRole(UserRole.USER);
        user = userRepository.save(user);
        System.out.println("UserService: saved user: " + user);
        ResponseUserDto responseUserDto = userMapper.toResponseDto(user);
        System.out.println("UserService: response dto user: " + responseUserDto);
        return responseUserDto;
    }

    @Override
    public User getUserById(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
    }

    @Override
    public ResponseUserDto getUserByID(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        System.out.println("user: " + user);
        ResponseUserDto userDto = userMapper.toResponseDto(user);
        System.out.println("userDto: " + userDto);
        return userDto;
    }

    @Override
    public ResponseUserDto createDispatcher(CreateUserDto dispatcher) {
        User user = userMapper.toEntity(dispatcher);
        user.setEnabled(true);
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(UserRole.DISPATCHER);
        user = userRepository.save(user);
        return userMapper.toResponseDto(user);
    }

    @Override
    public ResponseUserDto createDriver(CreateUserDto driver) {
        User user = userMapper.toEntity(driver);
        user.setEnabled(true);
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(UserRole.DRIVER);

        user = userRepository.save(user);
        return userMapper.toResponseDto(user);
    }

    @Override
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id))
            throw new UsernameNotFoundException("user didn't exist");
        userRepository.deleteById(id);
    }

    @Override
    public ResponseUserDto updateUser(Long id, CreateUserDto userDto) {
        if (!userRepository.existsById(id))
            throw new UsernameNotFoundException("user didn't exist");
        Optional<User> userDb = userRepository.findById(id);
        User userReq = userMapper.toEntity(userDto, userDb.orElse(null));
        userReq.setId(id);
        User user = userRepository.save(userReq);
        return userMapper.toResponseDto(user);
    }

    @Override
    public ResponseUserPublicDto updateUser(Long id, UpdateUserDto userDto, UserRole role) {

        User currentUser = userRepository.findByIdAndRole(id, role).orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));

        User userReq = userMapper.toEntity(userDto, currentUser);

        userRepository.save(userReq);
        return userMapper.toResponsePublicDto(userReq);
    }

    @Override
    public List<ResponseUserPublicDto> getAllUsersWithRole(UserRole role) {
        return userRepository.findAllByRole(role)
                .stream().map(user -> userMapper.toResponsePublicDto(user)).toList();
    }

    @Override
    public List<ResponseUserPublicDto> getAllUsers() {
        return userRepository.findAll()
                .stream().map(user -> userMapper.toResponsePublicDto(user)).toList();
    }

    @Override
    public void deleteUser(Long id, UserRole userRole) {
        if (!userRepository.existsByIdAndRole(id, userRole)) throw new UserNotFoundException("there is no dispatcher with this id: " + id);
        User user = userRepository.findByIdAndRole(id, userRole)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));
        userRepository.delete(user);
    }


}
