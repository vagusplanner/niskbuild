export default function UserDetailsCard({ user }) { return <div className="p-4 bg-white rounded-xl shadow-sm"><h3>User Details</h3><p>{user?.name || 'User'}</p></div>; }
