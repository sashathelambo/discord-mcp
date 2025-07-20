#!/usr/bin/env node

import { spawn } from 'child_process';

async function diagnoseClient() {
    console.log('🔍 Diagnosing MCP Client Issues...\n');
    
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    const mcpProcess = spawn('npx', ['-y', 'mcp-remote', 'https://discord-mcp-2blb1.sevalla.app'], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let connected = false;
    let initializeSuccess = false;
    let toolsListSuccess = false;

    mcpProcess.stderr.on('data', (data) => {
        const line = data.toString();
        if (line.includes('Connected to remote server')) {
            connected = true;
            console.log('✅ Connection established');
        }
        if (line.includes('Proxy established successfully')) {
            console.log('✅ Proxy established');
        }
    });

    mcpProcess.stdout.on('data', (data) => {
        const line = data.toString().trim();
        if (line.includes('"result"') && line.includes('protocolVersion')) {
            initializeSuccess = true;
            console.log('✅ Initialize successful');
        }
        if (line.includes('"tools"') && line.includes('inputSchema')) {
            toolsListSuccess = true;
            console.log('✅ Tools/list with schemas successful');
            console.log('📋 Tools found:', JSON.parse(line).result.tools.length);
        }
    });

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (!connected) {
        console.log('❌ Connection failed');
        mcpProcess.kill();
        return;
    }

    // Test 2: Initialize
    console.log('\n2️⃣ Testing initialize...');
    const initRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            clientInfo: { name: "diagnostic-client", version: "1.0.0" }
        }
    };
    mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Tools list
    console.log('\n3️⃣ Testing tools/list...');
    const toolsRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list"
    };
    mcpProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Tool call (if we got this far)
    if (toolsListSuccess) {
        console.log('\n4️⃣ Testing tool call...');
        const toolCallRequest = {
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: {
                name: "get_server_info",
                arguments: {}
            }
        };
        mcpProcess.stdin.write(JSON.stringify(toolCallRequest) + '\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    mcpProcess.kill();

    // Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY:');
    console.log(`Connection: ${connected ? '✅' : '❌'}`);
    console.log(`Initialize: ${initializeSuccess ? '✅' : '❌'}`);
    console.log(`Tools List: ${toolsListSuccess ? '✅' : '❌'}`);
    
    if (!connected) {
        console.log('\n🔧 SUGGESTED FIX: Check if Discord MCP server is deployed and accessible');
    } else if (!initializeSuccess) {
        console.log('\n🔧 SUGGESTED FIX: MCP protocol version mismatch or server error');
    } else if (!toolsListSuccess) {
        console.log('\n🔧 SUGGESTED FIX: Tools/list endpoint issue - check server logs');
    } else {
        console.log('\n✅ ALL TESTS PASSED - Client should work!');
        console.log('\n📝 Claude Desktop Config:');
        console.log(JSON.stringify({
            "mcpServers": {
                "discord-mcp": {
                    "command": "npx",
                    "args": ["-y", "mcp-remote", "https://discord-mcp-2blb1.sevalla.app"]
                }
            }
        }, null, 2));
    }
}

diagnoseClient().catch(console.error);