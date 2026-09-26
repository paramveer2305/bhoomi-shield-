import React from 'react';
import type { ParcelEvent } from '../../types';
import {
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Shield,
  MessageSquare,
} from 'lucide-react';

interface ParcelTimelineProps {
  events: ParcelEvent[];
}

const getEventIcon = (eventType: string) => {
  const type = eventType.toUpperCase();
  if (type.includes('DOCUMENT') || type.includes('UPLOAD')) {
    return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100' };
  }
  if (type.includes('RISK') || type.includes('ANALYSIS')) {
    return { icon: Activity, color: 'text-purple-500', bg: 'bg-purple-100' };
  }
  if (type.includes('ALERT')) {
    return { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100' };
  }
  if (type.includes('VERIFICATION') || type.includes('VERIFIED')) {
    return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' };
  }
  if (type.includes('CASE')) {
    return { icon: Shield, color: 'text-orange-500', bg: 'bg-orange-100' };
  }
  if (type.includes('NOTE') || type.includes('COMMENT')) {
    return { icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-100' };
  }
  if (type.includes('LOCATION') || type.includes('GEO')) {
    return { icon: MapPin, color: 'text-teal-500', bg: 'bg-teal-100' };
  }
  if (type.includes('USER') || type.includes('ASSIGN')) {
    return { icon: User, color: 'text-pink-500', bg: 'bg-pink-100' };
  }
  return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' };
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatEventType = (eventType: string): string => {
  return eventType
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const ParcelTimeline: React.FC<ParcelTimelineProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No timeline events</h3>
        <p className="text-gray-600">No activity recorded for this parcel yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-8 pl-16">
        {events.map((event, index) => {
          const { icon: Icon, color, bg } = getEventIcon(event.event_type);
          const isLast = index === events.length - 1;

          return (
            <div key={event.event_id} className="relative">
              {/* Timeline node */}
              <div className="absolute left-[-16px] top-1 w-3 h-3 rounded-full border-4 border-white z-10" style={{ backgroundColor: color.replace('text-', '').replace('500', '') }}>
                <div className={`w-full h-full rounded-full ${bg}`} />
              </div>

              {/* Connecting line for non-last items */}
              {!isLast && (
                <div className="absolute left-[-13px] top-5 bottom-[-8px] w-0.5 bg-gray-200" />
              )}

              {/* Event content */}
              <div className="bg-white rounded-lg border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 p-2 rounded-lg ${bg}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>

                  {/* Event details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">{event.title}</h4>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {event.actor}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100`}>
                        {formatEventType(event.event_type)}
                      </span>
                    </div>

                    {/* Metadata if available */}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <details className="mt-3">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View additional details
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParcelTimeline;