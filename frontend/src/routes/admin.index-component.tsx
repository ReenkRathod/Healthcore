import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export default function AdminDashboard() {
  const queryClient = useQueryClient()
  
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { users: any[] } }>('/admin/users')
      return res.data.users
    }
  })

  const verifyDoctorMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`/admin/users/doctors/${userId}/verify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    }
  })

  const deactivateUserMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    }
  })

  if (isLoading) return <div className="p-8">Loading users...</div>

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {usersData?.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {user.role === 'DOCTOR' && user.doctorProfile && (
                    <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.doctorProfile.isVerifiedByAdmin ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {user.doctorProfile.isVerifiedByAdmin ? 'Verified' : 'Unverified'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {user.role === 'DOCTOR' && user.doctorProfile && !user.doctorProfile.isVerifiedByAdmin && (
                    <button 
                      onClick={() => verifyDoctorMutation.mutate(user.id)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Verify
                    </button>
                  )}
                  {user.role === 'DOCTOR' && user.doctorProfile?.certificateUrl && (
                    <a 
                      href={user.doctorProfile.certificateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      View Certificate
                    </a>
                  )}
                  {user.isActive && (
                    <button 
                      onClick={() => deactivateUserMutation.mutate(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
