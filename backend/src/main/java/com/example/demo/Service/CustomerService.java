package com.example.demo.Service;

import com.example.demo.Model.Dto.ResponseUserDto;
import com.example.demo.Model.Dto.ResponseUserPublicDto;
import com.example.demo.Model.Dto.UpdateCustomerDto;

import java.util.List;

public interface CustomerService {

    ResponseUserDto getCustomerById(Long id);

    ResponseUserPublicDto getCustomerPublicById(Long id);

    ResponseUserDto updateCustomer(Long id, UpdateCustomerDto updateCustomerDto);

    void deleteCustomer(Long id);

    List<ResponseUserPublicDto> getAllCustomers();
}
