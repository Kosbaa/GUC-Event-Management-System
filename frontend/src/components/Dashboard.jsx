  
  
  const Dashboard = () => (
    <>
      {/* Hero (logged-in staff) */}
      <Section background="gradient" padding="py-20">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Welcome back,</h1>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-yellow-400 text-gray-900 font-bold flex items-center justify-center text-2xl">DA</div>
              <div>
                <div className="text-2xl font-semibold">Dr. Ahmed</div>
                <div className="text-sm text-gray-300">Events Office • Staff</div>
              </div>
            </div>

            <p className="text-gray-300 max-w-2xl mt-4">Here are the tasks awaiting your attention and a quick overview of upcoming activity.</p>

            <div className="mt-6 flex flex-wrap gap-4">
              <Button variant="primary">Create Event</Button>
              <Button variant="outline">Pending Requests</Button>
              <Button variant="secondary">Generate Report</Button>
            </div>
          </div>

          <div className="w-full md:w-96 bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="text-2xl font-bold">8</div>
                <div className="text-sm text-gray-300">Pending Requests</div>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="text-2xl font-bold">12</div>
                <div className="text-sm text-gray-300">Upcoming Events</div>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="text-2xl font-bold">5</div>
                <div className="text-sm text-gray-300">Active Vendors</div>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="text-2xl font-bold">3</div>
                <div className="text-sm text-gray-300">Reports Pending</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Quick Search removed per request */}

      {/* Staff Actions */}
      <Section id="staff-actions" background="dark" padding="py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Staff Actions</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-red-600 to-yellow-500 rounded-full mt-2"></div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:shadow-lg">
            <h3 className="text-xl font-semibold mb-2">Approve Events</h3>
            <p className="text-gray-300 mb-4">Review incoming event requests. Approve, request changes, or reject with comments.</p>
            <Button variant="primary">Review Requests</Button>
          </div>

          <div id="vendors" className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:shadow-lg">
            <h3 className="text-xl font-semibold mb-2">Manage Vendors</h3>
            <p className="text-gray-300 mb-4">Approve vendor participation, allocate stalls and confirm payments.</p>
            <Button variant="primary">Manage Vendors</Button>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:shadow-lg">
            <h3 className="text-xl font-semibold mb-2">Create Workshop</h3>
            <p className="text-gray-300 mb-4">Add workshop details, location, capacity and assign instructors.</p>
            <Button variant="primary">Create Workshop</Button>
          </div>

          <div id="reports" className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:shadow-lg">
            <h3 className="text-xl font-semibold mb-2">Conference Management</h3>
            <p className="text-gray-300 mb-4">Create conferences, set schedules, and publish proceedings.</p>
            <Button variant="primary">Create Conference</Button>
          </div>
        </div>
      </Section>

      {/* Note: Event components are available via Sidebar sections only */}
    </>
  );