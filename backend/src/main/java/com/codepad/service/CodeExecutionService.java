package com.codepad.service;

import com.codepad.dto.RunResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Service
public class CodeExecutionService {

    @Value("${codepad.execution.timeout-seconds:5}")
    private int timeoutSeconds;

    @Value("${codepad.execution.memory-limit-mb:256}")
    private int memoryLimitMb;

    public RunResponse execute(String code, String language) {
        if (!"python".equals(language) && !"javascript".equals(language)) {
            return new RunResponse("", "Unsupported language: " + language + ". Only python and javascript are supported.", 1, false);
        }

        try {
            Path tempFile = createTempFile(code, language);
            try {
                String[] command = buildDockerCommand(tempFile, language);
                ProcessBuilder pb = new ProcessBuilder(command);
                pb.redirectErrorStream(false);

                Process process = pb.start();

                StringBuilder stdout = new StringBuilder();
                StringBuilder stderr = new StringBuilder();

                Thread stdoutThread = new Thread(() -> readStream(process.getInputStream(), stdout));
                Thread stderrThread = new Thread(() -> readStream(process.getErrorStream(), stderr));
                stdoutThread.start();
                stderrThread.start();

                boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);

                if (!finished) {
                    process.destroyForcibly();
                    return new RunResponse(stdout.toString(), "Execution timed out after " + timeoutSeconds + " seconds", 137, true);
                }

                stdoutThread.join(1000);
                stderrThread.join(1000);

                return new RunResponse(
                        truncate(stdout.toString(), 10000),
                        truncate(stderr.toString(), 10000),
                        process.exitValue(),
                        false
                );
            } finally {
                Files.deleteIfExists(tempFile);
            }
        } catch (Exception e) {
            return new RunResponse("", "Execution error: " + e.getMessage(), 1, false);
        }
    }

    private Path createTempFile(String code, String language) throws IOException {
        String ext = "python".equals(language) ? ".py" : ".js";
        Path tempFile = Files.createTempFile("codepad-", ext);
        Files.writeString(tempFile, code);
        return tempFile;
    }

    private String[] buildDockerCommand(Path codeFile, String language) {
        String image = "python".equals(language) ? "python:3.12-slim" : "node:20-slim";
        String cmd = "python".equals(language) ? "python /code/main.py" : "node /code/main.js";
        String fileName = "python".equals(language) ? "main.py" : "main.js";

        return new String[]{
                "docker", "run", "--rm",
                "--network", "none",
                "--memory", memoryLimitMb + "m",
                "--cpus", "0.5",
                "--pids-limit", "64",
                "--read-only",
                "--tmpfs", "/tmp:size=64m",
                "-v", codeFile.toAbsolutePath() + ":/code/" + fileName + ":ro",
                image,
                "sh", "-c", cmd
        };
    }

    private void readStream(InputStream is, StringBuilder sb) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (sb.length() > 0) sb.append("\n");
                sb.append(line);
            }
        } catch (IOException ignored) {}
    }

    private String truncate(String s, int maxLen) {
        return s.length() > maxLen ? s.substring(0, maxLen) + "\n... (output truncated)" : s;
    }
}
