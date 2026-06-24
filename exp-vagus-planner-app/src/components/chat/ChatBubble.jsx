export default function ChatBubble({ message, isOwn }) { return <div className={`p-3 rounded-lg ${isOwn ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-100'} max-w-[70%]`}>{message || 'Hello'}</div>; }
