export default function CourtCard({ sportName, image, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl"
    >
      <div className="aspect-[16/9] relative">
        <img
          src={image}
          alt={sportName}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="court-card-overlay absolute inset-0" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-semibold text-white">{sportName}</h3>
        </div>
      </div>
    </div>
  );
};
