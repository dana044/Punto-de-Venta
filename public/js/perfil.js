/**
 * @file perfil.js
 * @description Renderizado global del perfil y avatar del usuario en el sidebar.
 * Asigna dinámicamente la imagen, nombre y rol según la sesión activa en localStorage.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */
(function () {
  function inicializarPerfilSidebar() {
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName') || 'Usuario';

    if (!userRole) return;

    const avatarImg = document.getElementById('userAvatarImg');
    const displayName = document.getElementById('userDisplayName');
    const displayRole = document.getElementById('userDisplayRole');

    // Mapeo a las ilustraciones oficiales con mandil
    const avatarPorRol = {
      administrador: '/img/avatars/admin.png',   // Cotorro con mandil
      almacenista: '/img/avatars/almacen.png',   // Perro salchicha negro con mandil
      cajero: '/img/avatars/cajero.png'          // Conejo blanco con mandil
    };

    const rutaAvatar = avatarPorRol[userRole.toLowerCase()] || '/img/avatars/cajero.png';

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarPerfilSidebar);
  } else {
    inicializarPerfilSidebar();
  }
})();