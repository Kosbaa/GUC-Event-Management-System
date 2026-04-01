import React, { useEffect, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import DynamicTable from "./DynamicTable";

export default function BazaarList() {
  const [bazaars, setBazaars] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch upcoming bazaars
  const fetchBazaars = async () => {
    try {
      setLoading(true);
      const res = await api.get("/events/bazaars");
      console.log("Bazaars response:", res.data); // Debug log
      // Filter upcoming bazaars (startDate > today)
      const today = new Date();
      const upcomingBazaars = res.data.filter(bazaar => 
        new Date(bazaar.startDate) > today
      );
      console.log("Upcoming bazaars:", upcomingBazaars); // Debug log
      setBazaars(upcomingBazaars);
    } catch (err) {
      console.error("Error fetching bazaars:", err);
      toast.error("Failed to load bazaars");
      setBazaars([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBazaars();
  }, []);

  // Define table columns
  const columns = [
    { key: "name", label: "Bazaar Name" },
    { key: "location", label: "Location" },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "registrationDeadline", label: "Registration Deadline" },
    { key: "shortDescription", label: "Description" },
  ];

  // Format dates for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Transform data for table display
  const tableData = bazaars.map(bazaar => ({
    ...bazaar,
    startDate: formatDate(bazaar.startDate),
    endDate: formatDate(bazaar.endDate),
    registrationDeadline: formatDate(bazaar.registrationDeadline),
  }));

  return (
    <div className="p-8 text-white">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading bazaars...</div>
        </div>
      ) : bazaars.length === 0 ? (
        <div className="bg-gray-900 p-6 rounded-2xl shadow-md">
          <h2 className="text-xl font-bold mb-4">Upcoming Bazaars</h2>
          <p className="text-gray-300">No upcoming bazaars found.</p>
        </div>
      ) : (
        <DynamicTable
          title="Upcoming Bazaars"
          columns={columns}
          data={tableData}
          onCreate={null} // No create functionality for vendors
          onDelete={null} // No delete functionality for vendors
        />
      )}
    </div>
  );
}
