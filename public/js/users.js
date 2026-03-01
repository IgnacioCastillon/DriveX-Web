document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("createModal");
    const overlay = document.getElementById("modalOverlay");
    const openBtn = document.getElementById("openCreateModal");
    const openBtn2 = document.getElementById("openCreateModal2");
    const closeBtn = document.getElementById("closeCreateModal");
    const cancelBtn = document.getElementById("cancelCreate");
    const refreshBtn = document.getElementById("refreshBtn");
  
    const roleFilter = document.getElementById("roleFilter");
    const sortBy = document.getElementById("sortBy");
    const usersGrid = document.getElementById("usersGrid");
  
    const alertClose = document.querySelector(".alert-close");
  
    const photoInput = document.getElementById("photo");
    const photoPreview = document.getElementById("photoPreview");
    const photoEmpty = document.getElementById("photoEmpty");
  
    function openModal(){
      overlay?.classList.add("open");
      modal?.classList.add("open");
      overlay?.setAttribute("aria-hidden", "false");
      modal?.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  
    function closeModal(){
      overlay?.classList.remove("open");
      modal?.classList.remove("open");
      overlay?.setAttribute("aria-hidden", "true");
      modal?.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  
    openBtn?.addEventListener("click", openModal);
    openBtn2?.addEventListener("click", openModal);
    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);
    overlay?.addEventListener("click", closeModal);
  
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  
    refreshBtn?.addEventListener("click", () => {
      window.location.reload();
    });
  
    alertClose?.addEventListener("click", () => {
      alertClose.closest(".alert")?.remove();
    });
  
    document.querySelectorAll(".copy-email").forEach(btn => {
      btn.addEventListener("click", async () => {
        const email = btn.dataset.email || "";
        if (!email) return;
  
        try {
          await navigator.clipboard.writeText(email);
          btn.textContent = "Copied!";
          setTimeout(() => btn.textContent = "Copy email", 900);
        } catch {
          prompt("Copy email:", email);
        }
      });
    });
  
    photoInput?.addEventListener("change", () => {
      const file = photoInput.files?.[0];
      if (!file) {
        photoPreview.style.display = "none";
        photoEmpty.style.display = "block";
        photoPreview.src = "";
        return;
      }
  
      const url = URL.createObjectURL(file);
      photoPreview.src = url;
      photoPreview.style.display = "block";
      photoEmpty.style.display = "none";
    });
  
    function applyFilterSort(){
      const cards = Array.from(usersGrid?.querySelectorAll(".user-card") || []);
      const role = roleFilter?.value || "all";
      const sort = sortBy?.value || "nameAsc";
  
      cards.forEach(card => {
        const cardRole = card.dataset.role || "User";
        const visible = (role === "all") || (cardRole === role);
        card.style.display = visible ? "" : "none";
      });
  
      const visibleCards = cards.filter(c => c.style.display !== "none");
  
      visibleCards.sort((a, b) => {
        const nameA = (a.dataset.name || "").toLowerCase();
        const nameB = (b.dataset.name || "").toLowerCase();
        const roleA = (a.dataset.role || "").toLowerCase();
        const roleB = (b.dataset.role || "").toLowerCase();
  
        if (sort === "nameAsc") return nameA.localeCompare(nameB);
        if (sort === "nameDesc") return nameB.localeCompare(nameA);
        if (sort === "roleAsc") return roleA.localeCompare(roleB);
        if (sort === "roleDesc") return roleB.localeCompare(roleA);
        return 0;
      });
  
      visibleCards.forEach(c => usersGrid.appendChild(c));
    }
  
    roleFilter?.addEventListener("change", applyFilterSort);
    sortBy?.addEventListener("change", applyFilterSort);
    applyFilterSort();
  });

    document.addEventListener("click", async (e) => {
        const btn = e.target.closest(".delete-user");
        if (!btn) return;
    
        const userId = btn.dataset.userId;
        const userName = btn.dataset.userName || "this user";
    
        if (!userId) {
          alert("Missing user id (data-user-id).");
          return;
        }
    
        const typed = prompt(`Type YES to delete ${userName}.`);
        if (typed !== "YES") return;
    
        btn.disabled = true;
        const oldText = btn.textContent;
        btn.textContent = "Deleting...";
    
        try {
          const res = await fetch(`/users/${userId}`, { method: "DELETE" });
    
          if (!res.ok) {
            const msg = await res.text().catch(() => "");
            throw new Error(`Delete failed: ${res.status} ${msg}`);
          }
    
          const card = btn.closest(".user-card");
          if (card) card.remove();
    
        } catch (err) {
          console.error(err);
          alert("Could not delete the user. Check console.");
          btn.disabled = false;
          btn.textContent = oldText;
        }
      });