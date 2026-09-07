package com.example.demo.Service;

import com.example.demo.Model.Dto.CreateUserDto;
import com.example.demo.Model.Dto.ResponseUserDto;

public interface DriverService {
    public ResponseUserDto create(CreateUserDto dispatcher);
    
}
