export const Testimonials = () => {
  return (
    <section className="py-16 px-6 bg-clay">
      <h2 className="text-3xl font-semibold text-center mb-10">What Our Clients Say</h2>
      <div className="flex flex-col items-center space-y-8">
        <div className="bg-white shadow-lg rounded-lg p-6 text-center w-80">
          <p className="text-lg mb-4">"PhoenixLawns transformed our garden! Professional and friendly service."</p>
          <p className="text-sm text-gray-500">- Jane Doe</p>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6 text-center w-80">
          <p className="text-lg mb-4">"Great service and attention to detail. Our lawn has never looked better!"</p>
          <p className="text-sm text-gray-500">- John Smith</p>
        </div>
      </div>
    </section>
  )
}
