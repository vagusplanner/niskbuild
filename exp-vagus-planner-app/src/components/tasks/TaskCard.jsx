export default function TaskCard({ task }) { return <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200"><h4>{task?.title || 'Task'}</h4></div>; }
