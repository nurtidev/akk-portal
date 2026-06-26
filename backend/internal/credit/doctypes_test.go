package credit

import (
	"testing"
	"time"
)

func TestVaultStatus(t *testing.T) {
	now := time.Date(2026, 6, 26, 12, 0, 0, 0, time.UTC)

	// бессрочный (nil) — всегда valid
	if got := vaultStatus(nil, now); got != VaultValid {
		t.Fatalf("nil: got %s, want valid", got)
	}
	// действует ещё долго
	long := now.AddDate(0, 0, 60)
	if got := vaultStatus(&long, now); got != VaultValid {
		t.Fatalf("long: got %s, want valid", got)
	}
	// истекает в пределах порога (7 дней)
	soon := now.AddDate(0, 0, 3)
	if got := vaultStatus(&soon, now); got != VaultExpiring {
		t.Fatalf("soon: got %s, want expiring", got)
	}
	// просрочен
	past := now.AddDate(0, 0, -1)
	if got := vaultStatus(&past, now); got != VaultExpired {
		t.Fatalf("past: got %s, want expired", got)
	}
}

func TestComputeValidUntil(t *testing.T) {
	issued := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)

	// бессрочный тип → nil
	perm, _ := vaultDocType("id_card")
	if got := computeValidUntil(perm, issued); got != nil {
		t.Fatalf("id_card: got %v, want nil (бессрочно)", got)
	}
	// короткая справка КГД (30 дней)
	short, _ := vaultDocType("tax_clearance")
	got := computeValidUntil(short, issued)
	if got == nil {
		t.Fatal("tax_clearance: got nil, want дату")
	}
	want := issued.AddDate(0, 0, 30)
	if !got.Equal(want) {
		t.Fatalf("tax_clearance: got %v, want %v", got, want)
	}
}

func TestVaultDocType_Lookup(t *testing.T) {
	if _, ok := vaultDocType("fin_statements"); !ok {
		t.Fatal("fin_statements должен быть в каталоге хранилища")
	}
	if _, ok := vaultDocType("nope"); ok {
		t.Fatal("несуществующий тип не должен находиться")
	}
}
