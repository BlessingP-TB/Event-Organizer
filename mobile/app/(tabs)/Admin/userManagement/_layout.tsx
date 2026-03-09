import { Stack } from 'expo-router';
import React from 'react';

export default function UserManagementStack() {
    return (
        <Stack>
            <Stack.Screen
                name="index" // This is your index.jsx (UserManagement list)
                options={{ title: 'User Management', headerShown: true }}
            />
            <Stack.Screen
                name="AdminUserDetails" // This is your AdminUserDetails.jsx
                options={{ title: 'User Profile', headerShown: true }}
            />
        </Stack>
    );
}