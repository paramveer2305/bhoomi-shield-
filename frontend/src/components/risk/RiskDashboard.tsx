import React, { useState, useEffect, useCallback } from 'react';
import { risk } from '../../api/risk';
import type { RiskAnalysis, RiskReason } from '../../types';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  Loader2,
  RefreshCw,
  Target,
  Flag,
  Activity,
} from 'lucide-react';

interface RiskDashboardProps {
  parcelId: string;
}

const getScoreColor = (score: number): string => {
  if (score <= 30) return 'text-green-600';
  if (score <= 60) return 'text-yellow-600';
  if (score <= 80) return 'text-orange-600';
  return 'text-red-600';
};

const getScoreBgColor = (score: number): string => {
  if (score <= 30) return 'bg-green-500';
  if (score <= 60) return 'bg-yellow-500';
  if (score <= 80) return 'bg-orange-500';
  return 'bg-red-500';
};

const getLevelBadgeClass = (level: string): string => {
  switch (level) {
    case 'LOW':
      return 'bg-green-100 text-green-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800';
    case 'CRITICAL':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'INCREASING':
      return <TrendingUp className="w-5 h-5 text-red-500" />;
    case 'DECREASING':
      return <TrendingDown className="w-5 h-5 text-green-500" />;
    default:
      return <Minus className="w-5 h-5 text-gray-500" />;
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const CircularGauge: React.FC<{ score: number; size?: number; strokeWidth?: number }> = ({
  score,
  size = 120,
  strokeWidth = 10,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getScoreBgColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
          <div className="text-xs text-gray-500 mt-1">Risk Score</div>
        </div>
      </div>
    </div>
  );
};

const RiskReasonCard: React.FC<{ reason: RiskReason }> = ({ reason }) => {
  const impactPercentage = Math.min(100, Math.max(0, reason.impact * 100));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-50 text-red-600 rounded-lg flex-shrink-0">
          <Flag className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">{reason.factor}</h4>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-mono font-medium">
              {Math.round(impactPercentage)}% impact
            </span>
          </div>
          {reason.description && (
            <p className="text-sm text-gray-600 mt-1">{reason.description}</p>
          )}
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all duration-500"
              style={{ width: `${impactPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const RiskTrendChart: React.FC<{ history: RiskAnalysis[] }> = ({ history }) => {
  const [selectedPoint, setSelectedPoint] = useState<RiskAnalysis | null>(null);

  if (!history || history.length === 0) {
    return null;
  }

  // Ensure chronological ordering by created_at ascending
  const sorted = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const delta = latest.score - first.score;

  // Chart layout dimensions
  const width = 640;
  const height = 180;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 40;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const getX = (idx: number) => {
    if (sorted.length === 1) return padLeft + plotWidth / 2;
    return padLeft + (idx / (sorted.length - 1)) * plotWidth;
  };

  const getY = (score: number) => {
    const clamped = Math.max(0, Math.min(100, score));
    return padTop + (1 - clamped / 100) * plotHeight;
  };

  const points = sorted.map((item, idx) => ({
    x: getX(idx),
    y: getY(item.score),
    data: item,
  }));

  const pathD = points.length === 1
    ? ''
    : points.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z`
    : '';

  const formatShortDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatShortTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Risk Score Trend & Timeline</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">
              {sorted.length} {sorted.length === 1 ? 'record' : 'records'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Chronological trajectory of AI risk evaluations over time
          </p>
        </div>

        {/* Delta indicator */}
        <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/60 text-xs">
          <span className="text-gray-500">Initial: <strong className="text-gray-700">{first.score}</strong></span>
          <span className="text-gray-300">→</span>
          <span className="text-gray-500">Latest: <strong className="text-gray-900">{latest.score}</strong></span>
          <span className="text-gray-300">|</span>
          <span className={`font-semibold flex items-center gap-0.5 ${
            delta > 0 ? 'text-red-600' : delta < 0 ? 'text-green-600' : 'text-gray-600'
          }`}>
            {delta > 0 ? `+${delta} (Escalating)` : delta < 0 ? `${delta} (Decreasing)` : '0 (Stable)'}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* SVG Chart Container */}
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[500px]"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="riskAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Threshold reference lines */}
            {[
              { val: 85, color: '#f87171' },
              { val: 60, color: '#fb923c' },
              { val: 30, color: '#facc15' },
              { val: 0, color: '#e5e7eb' },
            ].map((thresh) => {
              const y = getY(thresh.val);
              return (
                <g key={thresh.val}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke={thresh.color}
                    strokeDasharray={thresh.val === 0 ? undefined : '4 4'}
                    strokeWidth={thresh.val === 0 ? 1.5 : 1}
                    opacity={thresh.val === 0 ? 0.7 : 0.45}
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="#9ca3af"
                    fontWeight="500"
                  >
                    {thresh.val}
                  </text>
                </g>
              );
            })}

            {/* Area under curve */}
            {areaD && (
              <path d={areaD} fill="url(#riskAreaGrad)" />
            )}

            {/* Connecting line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points */}
            {points.map((pt, idx) => {
              const item = pt.data;
              const isSelected = selectedPoint?.risk_id === item.risk_id;
              const pointColor =
                item.score >= 85 ? '#ef4444' :
                item.score >= 60 ? '#f97316' :
                item.score >= 30 ? '#eab308' : '#10b981';

              return (
                <g
                  key={item.risk_id || idx}
                  className="cursor-pointer"
                  onClick={() => setSelectedPoint(isSelected ? null : item)}
                >
                  {/* Outer circle for selection */}
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="12"
                      fill={pointColor}
                      opacity="0.25"
                    />
                  )}

                  {/* Point circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 6.5 : 5}
                    fill="#ffffff"
                    stroke={pointColor}
                    strokeWidth="3"
                  />

                  {/* Score label badge above point */}
                  <rect
                    x={pt.x - 14}
                    y={pt.y - 23}
                    width="28"
                    height="16"
                    rx="4"
                    fill={pointColor}
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#ffffff"
                  >
                    {item.score}
                  </text>

                  {/* Date label on X-axis */}
                  <text
                    x={pt.x}
                    y={padTop + plotHeight + 16}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="500"
                    fill="#6b7280"
                  >
                    {formatShortDate(item.created_at)}
                  </text>
                  <text
                    x={pt.x}
                    y={padTop + plotHeight + 28}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#9ca3af"
                  >
                    {formatShortTime(item.created_at)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Point Details Callout or Baseline Note */}
        {selectedPoint ? (
          <div className="mt-4 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-indigo-900">Evaluation on {formatDate(selectedPoint.created_at)}:</span>
              <span className={`px-2 py-0.5 rounded font-bold ${getLevelBadgeClass(selectedPoint.level)}`}>
                {selectedPoint.level} ({selectedPoint.score}/100)
              </span>
              <span className="text-gray-600">
                Trend: <strong>{selectedPoint.trend}</strong>
              </span>
            </div>
            <div className="text-gray-600">
              Risk Signals: <strong>{selectedPoint.reasons?.length || 0} factors identified</strong>
            </div>
          </div>
        ) : sorted.length === 1 ? (
          <div className="mt-2 text-xs text-gray-500 italic text-center">
            Baseline evaluation established. Re-running analysis or attaching documents will record further trajectory points.
          </div>
        ) : (
          <div className="mt-2 text-xs text-gray-400 text-center">
            Click on any evaluation node above to inspect details.
          </div>
        )}
      </div>
    </div>
  );
};

const RiskDashboard: React.FC<RiskDashboardProps> = ({ parcelId }) => {
  const [riskData, setRiskData] = useState<RiskAnalysis | null>(null);
  const [historyData, setHistoryData] = useState<RiskAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const fetchRiskData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [latest, history] = await Promise.all([
        risk.getRiskAnalysis(parcelId),
        risk.getRiskHistory(parcelId),
      ]);
      setRiskData(latest);
      setHistoryData(history);
    } catch (err) {
      setError('Failed to load risk analysis. Please try again.');
      console.error('Error fetching risk data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [parcelId]);

  const handleAnalyzeRisk = async () => {
    setIsAnalyzing(true);
    setError('');
    try {
      const data = await risk.analyzeRisk(parcelId);
      setRiskData(data);
      try {
        const history = await risk.getRiskHistory(parcelId);
        setHistoryData(history);
      } catch (histErr) {
        console.warn('Could not refresh risk history:', histErr);
      }
    } catch (err) {
      setError('Failed to run risk analysis. Please try again.');
      console.error('Error analyzing risk:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, [fetchRiskData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Risk Intelligence</h2>
            <p className="text-gray-600 mt-1">AI-powered cadastral risk assessment</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score Card Skeleton */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="flex justify-center">
              <div className="w-32 h-32 bg-gray-200 rounded-full" />
            </div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto" />
          </div>
          {/* Level Card Skeleton */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="h-10 bg-gray-200 rounded w-1/2 mx-auto" />
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto" />
          </div>
          {/* Trend Card Skeleton */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="h-10 bg-gray-200 rounded w-1/2 mx-auto" />
            <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error && !riskData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600">{error}</p>
        <button
          onClick={fetchRiskData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!riskData) {
    return (
      <div className="text-center py-12">
        <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Risk Analysis Available</h3>
        <p className="text-gray-600 mb-4">Run an AI risk analysis to generate insights for this parcel.</p>
        <button
          onClick={handleAnalyzeRisk}
          disabled={isAnalyzing}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Run AI Risk Analysis
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Risk Intelligence</h2>
          <p className="text-gray-600 mt-1">AI-powered cadastral risk assessment and risk signals</p>
        </div>
        <button
          onClick={handleAnalyzeRisk}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Re-run Analysis
            </>
          )}
        </button>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk Score */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Overall Risk Score</h3>
          <div className="flex flex-col items-center">
            <CircularGauge score={riskData.score} size={140} strokeWidth={12} />
            <div className="mt-4 text-center">
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getLevelBadgeClass(
                  riskData.level
                )}`}
              >
                {riskData.level}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Level */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Risk Level</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">{riskData.level}</div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <span>Last assessed: {formatDate(riskData.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Risk Trend</h3>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {getTrendIcon(riskData.trend)}
              <span className="text-2xl font-bold text-gray-900 capitalize">{riskData.trend.toLowerCase()}</span>
            </div>
            <p className="text-sm text-gray-600">
              {riskData.trend === 'INCREASING' && 'Risk signals are escalating'}
              {riskData.trend === 'DECREASING' && 'Risk signals are subsiding'}
              {riskData.trend === 'STABLE' && 'Risk signals remain consistent'}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Trend Chart */}
      <RiskTrendChart history={historyData} />

      {/* Risk Signals */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Risk Signals ({riskData.reasons.length})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Factors contributing to the current risk assessment
          </p>
        </div>
        <div className="p-6">
          {riskData.reasons.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h4 className="font-medium text-gray-900 mb-1">No Risk Signals Detected</h4>
              <p className="text-gray-600">No potential inconsistencies identified in the current analysis.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {riskData.reasons.map((reason, index) => (
                <RiskReasonCard key={index} reason={reason} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Recommended Actions
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Suggested steps for verification and risk mitigation
          </p>
        </div>
        <div className="p-6">
          {riskData.recommended_actions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No specific actions recommended at this time.</p>
          ) : (
            <ul className="space-y-3">
              {riskData.recommended_actions.map((action, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-700">{action}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Risk ID</p>
            <p className="font-mono text-gray-900">{riskData.risk_id}</p>
          </div>
          <div>
            <p className="text-gray-500">Parcel ID</p>
            <p className="font-mono text-gray-900">{riskData.parcel_id}</p>
          </div>
          <div>
            <p className="text-gray-500">Assessed On</p>
            <p className="font-mono text-gray-900">{formatDate(riskData.created_at)}</p>
          </div>
          <div>
            <p className="text-gray-500">Total Signals</p>
            <p className="font-mono text-gray-900">{riskData.reasons.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskDashboard;