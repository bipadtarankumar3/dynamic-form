export default function FieldConfigLayout({ children }) {
  return (
    <div className="h-full flex flex-col">
      
      {/* Tabs Content Area */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

    </div>
  );
}