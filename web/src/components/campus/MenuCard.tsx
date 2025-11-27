import { MenuResponse } from '../../api/campus/cafeteria.api';

interface MenuCardProps {
  menu: MenuResponse;
}

export function MenuCard({ menu }: MenuCardProps) {
  return (
    <div
      style={{
        border: '1px solid #ECEFF1',
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'all 0.2s',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {menu.image_url && (
        <div
          style={{
            width: '100%',
            height: 150,
            overflow: 'hidden',
            backgroundColor: '#F7F9FA',
          }}
        >
          <img
            src={menu.image_url}
            alt={menu.description}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}
      <div style={{ padding: 12 }}>
        <h4
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#0E4A84',
            marginBottom: 8,
            lineHeight: 1.4,
          }}
        >
          {menu.description}
        </h4>
        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#0E4A84',
            margin: 0,
          }}
        >
          {menu.price.toLocaleString()}원
        </p>
      </div>
    </div>
  );
}