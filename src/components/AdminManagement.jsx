/**
 * Admin Management - Administrative features interface
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Users, Shield, Database, Settings, FileText } from 'lucide-react';

export default function AdminManagement() {
  const [users, setUsers] = useState([]);
  const [acl, setAcl] = useState(null);
  const [codeSystems, setCodeSystems] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [usersResult, aclResult, codesResult, logsResult] = await Promise.all([
        apiService.request('/api/admin-mgmt/users', 'GET'),
        apiService.request('/api/admin-mgmt/acl', 'GET'),
        apiService.request('/api/admin-mgmt/code-systems', 'GET'),
        apiService.request('/api/admin-mgmt/logs?limit=50', 'GET')
      ]);

      if (usersResult.success) setUsers(usersResult.users || []);
      if (aclResult.success) setAcl(aclResult.acl);
      if (codesResult.success) setCodeSystems(codesResult.code_systems);
      if (logsResult.success) setLogs(logsResult.logs || []);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading admin data...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="acl">ACL</TabsTrigger>
              <TabsTrigger value="code-systems">Code Systems</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-4">
              <div className="space-y-2">
                {users.map((user) => (
                  <Card key={user.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-gray-600">{user.email} • {user.user_type}</p>
                      </div>
                      <Button size="sm" variant={user.is_active ? 'default' : 'outline'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="acl" className="mt-4">
              {acl && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Roles ({acl.roles?.length || 0})</h4>
                    <div className="space-y-2">
                      {acl.roles?.map((role) => (
                        <Card key={role.id} className="p-2">
                          <p className="font-medium">{role.role_name}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Permissions ({acl.permissions?.length || 0})</h4>
                    <div className="space-y-2">
                      {acl.permissions?.map((perm) => (
                        <Card key={perm.id} className="p-2">
                          <p className="font-medium">{perm.permission_name}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="code-systems" className="mt-4">
              {codeSystems && (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(codeSystems).map(([name, info]) => (
                    <Card key={name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{name}</p>
                          {info.version && <p className="text-sm text-gray-600">Version: {info.version}</p>}
                        </div>
                        <Button size="sm" variant={info.installed ? 'default' : 'outline'}>
                          {info.installed ? 'Installed' : 'Not Installed'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {logs.map((log) => (
                  <Card key={log.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{log.action_type}</p>
                        <p className="text-sm text-gray-600">
                          {log.resource_type} #{log.resource_id}
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.timestamp && new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

