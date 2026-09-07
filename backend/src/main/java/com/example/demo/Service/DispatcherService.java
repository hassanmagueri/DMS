package com.example.demo.Service;

import com.example.demo.Model.Dto.CreateUserDto;
import com.example.demo.Model.Dto.ResponseUserDto;
import com.example.demo.Model.Dto.ResponseUserPublicDto;
import com.example.demo.Model.Dto.UpdateUserDto;
import com.example.demo.Model.Entity.User;
import jakarta.validation.Valid;

import java.util.List;

public interface DispatcherService {
    ResponseUserDto create(CreateUserDto createUserDto);

    ResponseUserPublicDto update(Long id, @Valid UpdateUserDto dispatcher);

    void delete(Long id);

    List<ResponseUserPublicDto> getAllDispatchers();
}
