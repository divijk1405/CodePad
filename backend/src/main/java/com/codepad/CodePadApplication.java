package com.codepad;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CodePadApplication {
    public static void main(String[] args) {
        SpringApplication.run(CodePadApplication.class, args);
    }
}
