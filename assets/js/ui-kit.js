const tabs = document.querySelectorAll(".tab");

if (tabs.length) {
    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const group = tab.closest(".tabs");
            if (!group) {
                return;
            }
            group.querySelectorAll(".tab").forEach((item) => item.classList.remove("is-active"));
            tab.classList.add("is-active");
        });
    });
}
