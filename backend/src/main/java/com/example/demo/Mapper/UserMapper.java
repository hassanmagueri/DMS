package com.example.demo.Mapper;

import com.example.demo.Model.Dto.*;
import com.example.demo.Model.Entity.User;
import org.mapstruct.*;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface UserMapper {
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    User toEntity(CreateUserDto createUserDto);


    ResponseUserDto toResponseDto(User user);

    ResponseUserPublicDto toResponsePublicDto(User user);

    ResponseUserDto toResponseDto(User savedUser, String token);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    User toEntity(CreateUserDto userDto,@MappingTarget User user);

    User toEntity(ResponseUserPublicDto userDto);

    User toEntity(UpdateCustomerDto updateCustomerDto, @MappingTarget User user);

    User toEntity(UpdateUserDto userDto,@MappingTarget User user);
}
