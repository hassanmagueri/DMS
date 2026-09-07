package com.example.demo.Service.impl;

import com.example.demo.Mapper.UserMapper;
import com.example.demo.Model.Dto.CreateUserDto;
import com.example.demo.Model.Dto.ResponseUserDto;
import com.example.demo.Model.Entity.Driver;
import com.example.demo.Model.Entity.Enums.DriverStatus;
import com.example.demo.Model.Entity.Enums.UserRole;
import com.example.demo.Model.Entity.Enums.UserStatus;
import com.example.demo.Model.Entity.Enums.VehicleType;
import com.example.demo.Model.Entity.User;
import com.example.demo.Model.Entity.Vehicle;
import com.example.demo.Repository.DriverRepository;
import com.example.demo.Repository.UserRepository;
import com.example.demo.Service.DispatcherService;
import com.example.demo.Service.DriverService;
import com.example.demo.Service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DriverServiceImpl implements DriverService {
    final UserMapper userMapper;
    final UserRepository userRepository;
    final PasswordEncoder passwordEncoder;
    final DriverRepository driverRepository;
//    final VehicleService vehicleService;

    @Override
    public ResponseUserDto create(CreateUserDto dispatcher) {
        User user = userMapper.toEntity(dispatcher);
        user.setEnabled(true);
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(UserRole.DRIVER);
        user.setPassword(passwordEncoder.encode(dispatcher.getPassword()));

//        user = userRepository.save(user);

//        vehicleService.create()

        Vehicle vehicle = Vehicle.builder()
                .brand("MC")
                .model("MC")
                .plateNumber("MC")
                .type(VehicleType.MOTORCYCLE)
                .build();

        Driver driver = Driver.builder()
                .licenseNumber("dispatcher.getLicenseNumber()")
                .status(DriverStatus.AVAILABLE)
                .vehicle(vehicle)
                .user(user)
                .licenseNumber("lIS")
                .build();

        driverRepository.save(driver);
        return userMapper.toResponseDto(user);
    }
}
