package com.example.demo.Service.impl;

import com.example.demo.Exception.Custom.InvalidUserRoleException;
import com.example.demo.Exception.Custom.UserNotFoundException;
import com.example.demo.Mapper.UserMapper;
import com.example.demo.Model.Dto.ResponseUserDto;
import com.example.demo.Model.Dto.ResponseUserPublicDto;
import com.example.demo.Model.Dto.UpdateCustomerDto;
import com.example.demo.Model.Entity.Enums.UserRole;
import com.example.demo.Model.Entity.User;
import com.example.demo.Repository.UserRepository;
import com.example.demo.Service.CustomerService;
import com.example.demo.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {
    final UserRepository userRepository;
    final UserMapper userMapper;
    private final UserService userService;

    @Override
    public ResponseUserDto getCustomerById(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));
        return userMapper.toResponseDto(user);
    }

    @Override
    public ResponseUserPublicDto getCustomerPublicById(Long id) {
//        User user =
//                userRepository.findById(id)
//                        .orElseThrow(() -> new UserNotFoundException("Customer not found with id: " + id))
//                .filter(u -> u.getRole().equals(UserRole.CUSTOMER))
//                .orElseThrow(() -> new UsernameNotFoundException("Customer not found with id: " + id));
        User user = userRepository.findByIdAndRole(id, UserRole.CUSTOMER)
                .orElseThrow(() -> new UserNotFoundException("Customer not found with id: " + id));
        return userMapper.toResponsePublicDto(user);
    }

    @Override
    public ResponseUserDto updateCustomer(Long id, UpdateCustomerDto updateCustomerDto) {
        System.out.println("CustomerServiceImpl: updateCustomerDto: " + updateCustomerDto);

        User userDb = userRepository.findById(id).orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));
        System.out.println("CustomerServiceImpl: user: " + userDb);


        User user = userMapper.toEntity(updateCustomerDto, userDb);
        System.out.println("CustomerServiceImpl: updating user: " + user);



        user = userRepository.save(user);
        return userMapper.toResponseDto(user);
    }

    @Override
    public void deleteCustomer(Long id) {
        if (!userRepository.existsById(id)) throw new UserNotFoundException("Customer not found with id: " + id);
            User user = userRepository.findByIdAndRole(id, UserRole.CUSTOMER)
                    .orElseThrow(() -> new InvalidUserRoleException("this is not a customer : " + id));
        userRepository.delete(user);
    }

    @Override
    public List<ResponseUserPublicDto> getAllCustomers() {
        return userService.getAllUsersWithRole(UserRole.CUSTOMER);
    }

}
