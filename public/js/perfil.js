/**
 * @file perfil.js
 * @description Renderizado global del perfil y avatar del usuario en el sidebar.
 * Asigna dinámicamente la imagen, nombre y rol según la sesión activa en localStorage.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */
(function () {
  function inicializarPerfilSidebar() {
    const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
    const userName = localStorage.getItem('userName') || 'Usuario';

    if (!userRole) return;

    // 1. Renderizado de Avatar y Nombre
    const avatarImg = document.getElementById('userAvatarImg');
    const displayName = document.getElementById('userDisplayName');
    const displayRole = document.getElementById('userDisplayRole');

    // Mapeo a las ilustraciones oficiales con mandil
    const avatarPorRol = {
      administrador: '/img/avatars/admin.png',   // Cotorro con mandil
      almacenista: '/img/avatars/almacen.png',   // Perro salchicha negro con mandil
      cajero: '/img/avatars/cajero.png'          // Conejo blanco con mandil
    };

    const rutaAvatar = avatarPorRol[userRole] || '/img/avatars/cajero.png';

    if (avatarImg) {
      avatarImg.src = rutaAvatar;
      avatarImg.alt = `Perfil de ${userName}`;
    }

    if (displayName) {
      displayName.textContent = userName;
    }

    if (displayRole) {
      displayRole.textContent = userRole;
    }

    // 2. Control de Acceso y Visibilidad del Sidebar por Rol
    const menus = {
      menuPersonal: document.getElementById('menuPersonal'),
      menuPos: document.getElementById('menuPos'),
      menuInventario: document.getElementById('menuInventario'),
      menuRecepcion: document.getElementById('menuRecepcion'),
      menuProveedores: document.getElementById('menuProveedores'),
      menuReportes: document.getElementById('menuReportes'),
      menuHistorialVentas: document.getElementById('menuHistorialVentas')
    };

    // Ocultar todas las opciones inicialmente
    Object.values(menus).forEach(m => {
      if (m) m.hidden = true;
    });

    if (userRole === 'administrador') {
      // El administrador tiene acceso a todos los módulos
      Object.values(menus).forEach(m => {
        if (m) m.removeAttribute('hidden');
      });
    } else if (userRole === 'almacenista') {
      // El almacenista solo accede a Inventario, Recepción, Proveedores y Reportes (Stock)
      if (menus.menuInventario) menus.menuInventario.removeAttribute('hidden');
      if (menus.menuRecepcion) menus.menuRecepcion.removeAttribute('hidden');
      if (menus.menuProveedores) menus.menuProveedores.removeAttribute('hidden');
      if (menus.menuReportes) menus.menuReportes.removeAttribute('hidden');
    } else if (userRole === 'cajero') {
      // El cajero solo accede al POS y a su propio Historial de Ventas
      if (menus.menuPos) menus.menuPos.removeAttribute('hidden');
      if (menus.menuHistorialVentas) menus.menuHistorialVentas.removeAttribute('hidden');
    }

    // 3. Cierre de sesión centralizado
    document.getElementById('btnLogout')?.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.clear();
      window.location.href = '/login';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarPerfilSidebar);
  } else {
    inicializarPerfilSidebar();
  }
})();