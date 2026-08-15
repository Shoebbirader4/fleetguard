import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { costReportingApi } from '../lib/api';
import { formatINR } from '../lib/money';
import { useAuthStore } from '../stores/authStore';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function AnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  
  // Date range filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3); // Last 3 months
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');

  // Fetch vehicles for filter
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year, vin')
        .order('make', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch work orders for analytics
  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['analytics-work-orders', startDate, endDate, selectedVehicleId],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select(`
          *,
          vehicle:vehicles(id, make, model, year, current_odometer)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('status', ['completed', 'in_progress']);

      if (selectedVehicleId !== 'all') {
        query = query.eq('vehicle_id', selectedVehicleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate MTBF and MTTR
  const mtbfMttrMetrics = useMemo(() => {
    if (!workOrders || workOrders.length === 0) return null;

    const completedOrders = workOrders.filter((wo: any) => wo.status === 'completed');
    
    if (completedOrders.length === 0) return null;

    // Calculate total downtime
    const totalDowntimeHours = completedOrders.reduce((sum: number, wo: any) => {
      if (wo.started_at && wo.completed_at) {
        const start = new Date(wo.started_at).getTime();
        const end = new Date(wo.completed_at).getTime();
        return sum + (end - start) / (1000 * 60 * 60); // Convert to hours
      }
      return sum;
    }, 0);

    // MTTR = Total downtime / Number of repairs
    const mttr = totalDowntimeHours / completedOrders.length;

    // MTBF = Operating time / Number of failures
    // Simplified: assume 24/7 operation
    const daysBetween = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
    const totalOperatingHours = daysBetween * 24;
    const mtbf = totalOperatingHours / completedOrders.length;

    return {
      mtbf: mtbf.toFixed(1),
      mttr: mttr.toFixed(1),
      failure_count: completedOrders.length,
      total_downtime_hours: totalDowntimeHours.toFixed(1),
    };
  }, [workOrders, startDate, endDate]);

  // Calculate breakdown trends by failure category
  const breakdownTrends = useMemo(() => {
    if (!workOrders || workOrders.length === 0) return [];

    // Group by month and calculate failures
    // For simplicity, categorize based on keywords in description
    const categories = {
      Mechanical: ['engine', 'transmission', 'clutch', 'gear'],
      Electrical: ['battery', 'alternator', 'wiring', 'lights'],
      Brakes: ['brake', 'pad', 'rotor', 'caliper'],
      Tires: ['tire', 'wheel', 'puncture'],
      Body: ['body', 'paint', 'dent', 'window'],
      Other: [],
    };

    const categorizedFailures: Record<string, number> = {
      Mechanical: 0,
      Electrical: 0,
      Brakes: 0,
      Tires: 0,
      Body: 0,
      Other: 0,
    };

    workOrders.forEach((wo: any) => {
      const desc = wo.description.toLowerCase();
      let categorized = false;

      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some((keyword) => desc.includes(keyword))) {
          categorizedFailures[category]++;
          categorized = true;
          break;
        }
      }

      if (!categorized) {
        categorizedFailures.Other++;
      }
    });

    return Object.entries(categorizedFailures)
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / workOrders.length) * 100,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [workOrders]);

  // Calculate cost analysis
  const costAnalysis = useMemo(() => {
    if (!workOrders || workOrders.length === 0) {
      return {
        total_cost: 0,
        cost_per_vehicle: 0,
        cost_per_km: 0,
        parts_cost: 0,
        labor_cost: 0,
      };
    }

    const total_cost = workOrders.reduce((sum: number, wo: any) => sum + (wo.total_cost || 0), 0);
    const parts_cost = workOrders.reduce((sum: number, wo: any) => sum + (wo.total_parts_cost || 0), 0);
    const labor_cost = workOrders.reduce((sum: number, wo: any) => sum + (wo.total_labor_cost || 0), 0);

    const vehicleCount = selectedVehicleId !== 'all' ? 1 : vehicles?.length || 1;
    const cost_per_vehicle = total_cost / vehicleCount;

    // Calculate cost per km (simplified)
    const totalKm = workOrders.reduce((sum: number, wo: any) => {
      return sum + (wo.vehicle?.current_odometer || 0);
    }, 0);
    const avgKm = totalKm / workOrders.length;
    const cost_per_km = avgKm > 0 ? total_cost / avgKm : 0;

    return {
      total_cost,
      cost_per_vehicle,
      cost_per_km,
      parts_cost,
      labor_cost,
    };
  }, [workOrders, vehicles, selectedVehicleId]);

  // Calculate downtime analysis
  const downtimeAnalysis = useMemo(() => {
    if (!workOrders || workOrders.length === 0) return null;

    const vehicleDowntime: Record<string, number> = {};

    workOrders.forEach((wo: any) => {
      if (wo.started_at && wo.completed_at) {
        const start = new Date(wo.started_at).getTime();
        const end = new Date(wo.completed_at).getTime();
        const hours = (end - start) / (1000 * 60 * 60);

        const vehicleName = wo.vehicle ? `${wo.vehicle.make} ${wo.vehicle.model} ${wo.vehicle.year}` : 'Unknown';
        vehicleDowntime[vehicleName] = (vehicleDowntime[vehicleName] || 0) + hours;
      }
    });

    const totalDowntime = Object.values(vehicleDowntime).reduce((sum, hours) => sum + hours, 0);
    const vehicleCount = selectedVehicleId !== 'all' ? 1 : vehicles?.length || 1;

    return {
      total_downtime_hours: totalDowntime,
      downtime_per_vehicle: totalDowntime / vehicleCount,
      by_vehicle: Object.entries(vehicleDowntime)
        .map(([name, hours]) => ({
          name,
          hours: parseFloat(hours.toFixed(1)),
          percentage: (hours / totalDowntime) * 100,
        }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 10), // Top 10
    };
  }, [workOrders, vehicles, selectedVehicleId]);

  const formatCurrency = (amount: number) => formatINR(amount);

  const handleExportPDF = () => {
    if (!workOrders || workOrders.length === 0) {
      alert('No data available to export');
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.text('Fleet Analytics Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Date Range
      doc.setFontSize(10);
      doc.text(`Date Range: ${startDate} to ${endDate}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Vehicle Filter
      const vehicleFilter = selectedVehicleId === 'all' ? 'All Vehicles' : vehicles?.find(v => v.id === selectedVehicleId)?.make + ' ' + vehicles?.find(v => v.id === selectedVehicleId)?.model;
      doc.text(`Vehicle: ${vehicleFilter}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // MTBF & MTTR Metrics
      if (mtbfMttrMetrics) {
        doc.setFontSize(14);
        doc.text('Key Metrics', 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.text(`MTBF (Mean Time Between Failures): ${mtbfMttrMetrics.mtbf} hours`, 14, yPos);
        yPos += 6;
        doc.text(`MTTR (Mean Time To Repair): ${mtbfMttrMetrics.mttr} hours`, 14, yPos);
        yPos += 6;
        doc.text(`Total Failures: ${mtbfMttrMetrics.failure_count}`, 14, yPos);
        yPos += 6;
        doc.text(`Total Downtime: ${mtbfMttrMetrics.total_downtime_hours} hours`, 14, yPos);
        yPos += 12;
      }

      // Cost Analysis
      doc.setFontSize(14);
      doc.text('Cost Analysis', 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.text(`Total Cost: ${formatCurrency(costAnalysis.total_cost)}`, 14, yPos);
      yPos += 6;
      doc.text(`Cost per Vehicle: ${formatCurrency(costAnalysis.cost_per_vehicle)}`, 14, yPos);
      yPos += 6;
      doc.text(`Parts Cost: ${formatCurrency(costAnalysis.parts_cost)}`, 14, yPos);
      yPos += 6;
      doc.text(`Labor Cost: ${formatCurrency(costAnalysis.labor_cost)}`, 14, yPos);
      yPos += 12;

      // Breakdown Trends
      if (breakdownTrends.length > 0) {
        doc.setFontSize(14);
        doc.text('Breakdown by Category', 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        breakdownTrends.forEach((trend) => {
          doc.text(`${trend.category}: ${trend.count} (${trend.percentage.toFixed(1)}%)`, 14, yPos);
          yPos += 6;
          
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
        });
      }

      // Footer
      const timestamp = new Date().toLocaleString();
      doc.setFontSize(8);
      doc.text(`Generated on ${timestamp}`, 14, doc.internal.pageSize.getHeight() - 10);

      // Save PDF
      doc.save(`FleetGuard_Analytics_${startDate}_to_${endDate}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleExportExcel = () => {
    if (!workOrders || workOrders.length === 0) {
      alert('No data available to export');
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Summary Metrics
      const summaryData = [
        ['Fleet Analytics Report'],
        ['Date Range', `${startDate} to ${endDate}`],
        ['Vehicle Filter', selectedVehicleId === 'all' ? 'All Vehicles' : vehicles?.find(v => v.id === selectedVehicleId)?.make + ' ' + vehicles?.find(v => v.id === selectedVehicleId)?.model],
        [],
        ['Key Metrics'],
        ['MTBF (hours)', mtbfMttrMetrics?.mtbf || 'N/A'],
        ['MTTR (hours)', mtbfMttrMetrics?.mttr || 'N/A'],
        ['Total Failures', mtbfMttrMetrics?.failure_count || 0],
        ['Total Downtime (hours)', mtbfMttrMetrics?.total_downtime_hours || 0],
        [],
        ['Cost Analysis'],
        ['Total Cost', costAnalysis.total_cost],
        ['Cost per Vehicle', costAnalysis.cost_per_vehicle],
        ['Parts Cost', costAnalysis.parts_cost],
        ['Labor Cost', costAnalysis.labor_cost],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Sheet 2: Breakdown Trends
      if (breakdownTrends.length > 0) {
        const trendsData = [
          ['Category', 'Count', 'Percentage'],
          ...breakdownTrends.map((trend) => [
            trend.category,
            trend.count,
            `${trend.percentage.toFixed(1)}%`,
          ]),
        ];
        const trendsSheet = XLSX.utils.aoa_to_sheet(trendsData);
        XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Breakdown Trends');
      }

      // Sheet 3: Downtime by Vehicle
      if (downtimeAnalysis && downtimeAnalysis.by_vehicle.length > 0) {
        const downtimeData = [
          ['Vehicle', 'Downtime (hours)', 'Percentage'],
          ...downtimeAnalysis.by_vehicle.map((item) => [
            item.name,
            item.hours,
            `${item.percentage.toFixed(1)}%`,
          ]),
        ];
        const downtimeSheet = XLSX.utils.aoa_to_sheet(downtimeData);
        XLSX.utils.book_append_sheet(workbook, downtimeSheet, 'Downtime by Vehicle');
      }

      // Sheet 4: Work Orders Detail
      const workOrdersData = [
        ['ID', 'Vehicle', 'Description', 'Status', 'Total Cost', 'Parts Cost', 'Labor Cost', 'Created At'],
        ...workOrders.map((wo: any) => [
          wo.id,
          wo.vehicle ? `${wo.vehicle.make} ${wo.vehicle.model} ${wo.vehicle.year}` : 'Unknown',
          wo.description,
          wo.status,
          wo.total_cost || 0,
          wo.total_parts_cost || 0,
          wo.total_labor_cost || 0,
          new Date(wo.created_at).toLocaleDateString(),
        ]),
      ];
      const workOrdersSheet = XLSX.utils.aoa_to_sheet(workOrdersData);
      XLSX.utils.book_append_sheet(workbook, workOrdersSheet, 'Work Orders');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `FleetGuard_Analytics_${startDate}_to_${endDate}.xlsx`);
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Failed to export Excel. Please try again.');
    }
  };

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
                Fleet Analytics
              </h1>
              <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                Comprehensive maintenance and cost analytics
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
              >
                Export PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-normal leading-normal"
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="card mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vehicle
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Vehicles</option>
                {vehicles?.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} {vehicle.year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="card text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* MTBF & MTTR Metrics */}
            {mtbfMttrMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="card">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">MTBF</h3>
                  <div className="mt-2 text-3xl font-bold text-primary-600">
                    {mtbfMttrMetrics.mtbf}h
                  </div>
                  <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-1">
                    Mean Time Between Failures
                  </p>
                </div>

                <div className="card">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">MTTR</h3>
                  <div className="mt-2 text-3xl font-bold text-orange-600">
                    {mtbfMttrMetrics.mttr}h
                  </div>
                  <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-1">
                    Mean Time To Repair
                  </p>
                </div>

                <div className="card">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Failures</h3>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {mtbfMttrMetrics.failure_count}
                  </div>
                  <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-1">Total Failures</p>
                </div>

                <div className="card">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Downtime</h3>
                  <div className="mt-2 text-3xl font-bold text-red-600">
                    {mtbfMttrMetrics.total_downtime_hours}h
                  </div>
                  <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-1">Total Downtime</p>
                </div>
              </div>
            )}

            {/* Cost Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</h3>
                <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(costAnalysis.total_cost)}
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Cost per Vehicle</h3>
                <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(costAnalysis.cost_per_vehicle)}
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Parts Cost</h3>
                <div className="mt-2 text-2xl font-bold text-blue-600">
                  {formatCurrency(costAnalysis.parts_cost)}
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Labor Cost</h3>
                <div className="mt-2 text-2xl font-bold text-green-600">
                  {formatCurrency(costAnalysis.labor_cost)}
                </div>
              </div>
            </div>

            {/* Breakdown Trends Chart */}
            {breakdownTrends.length > 0 && (
              <div className="card mb-8">
                <h2 className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-100 mb-4">
                  Breakdown Trends by Category
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={breakdownTrends}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.category}: ${entry.count}`}
                    >
                      {breakdownTrends.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Downtime Analysis */}
            {downtimeAnalysis && downtimeAnalysis.by_vehicle.length > 0 && (
              <div className="card mb-8">
                <h2 className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-100 mb-4">
                  Downtime by Vehicle (Top 10)
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={downtimeAnalysis.by_vehicle}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="#ef4444" name="Downtime Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* No Data State */}
            {(!workOrders || workOrders.length === 0) && (
              <div className="card text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  No data available for the selected date range and filters.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
