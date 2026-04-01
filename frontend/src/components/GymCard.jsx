export default function GymCard ({ sessionType, image, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl"
    >
      <div className="aspect-[4/3] relative">
        <img
          src={image}
          alt={sessionType}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="gym-card-overlay absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="text-2xl font-semibold text-white drop-shadow-md">
            {sessionType}
          </h3>
        </div>
      </div>
    </div>
  );
};
