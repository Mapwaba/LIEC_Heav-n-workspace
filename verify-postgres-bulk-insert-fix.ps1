# ============================================================================
# LIEC Heav'n - PostgreSQL Bulk Insert Fix Verification Launcher
# ============================================================================
# Target: Dedicated Neon Preview Database (ep-wispy-firefly-b9el08l7)
# Strictly uses atomic transactions with ROLLBACK (Zero persistent writes).
# ============================================================================

[Console]::Title = "LIEC Heav'n - PostgreSQL Bulk Insert Fix Verification"
Clear-Host

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "LIEC Heav'n - PostgreSQL Bulk Insert Fix Verification Suite" -ForegroundColor White
Write-Host "Target Architecture: Neon Preview (ep-wispy-firefly-b9el08l7)" -ForegroundColor Yellow
Write-Host "Transaction Mode:    ATOMIC ISOLATED ROLLBACK (Zero DB Mutation)" -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Get-MaskedCredential {
    try {
        $form = New-Object System.Windows.Forms.Form
        $form.Text = "LIEC Heav'n - PostgreSQL Fix Verification"
        $form.Size = New-Object System.Drawing.Size(580, 280)
        $form.StartPosition = "CenterScreen"
        $form.TopMost = $true
        $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
        $form.MaximizeBox = $false
        $form.MinimizeBox = $false
        $form.ShowInTaskbar = $true

        $labelTitle = New-Object System.Windows.Forms.Label
        $labelTitle.Location = New-Object System.Drawing.Point(20, 15)
        $labelTitle.Size = New-Object System.Drawing.Size(520, 25)
        $labelTitle.Text = "LIEC Heav'n - Preview PostgreSQL Verification"
        $labelTitle.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
        $form.Controls.Add($labelTitle)

        $labelInfo = New-Object System.Windows.Forms.Label
        $labelInfo.Location = New-Object System.Drawing.Point(20, 45)
        $labelInfo.Size = New-Object System.Drawing.Size(520, 40)
        $labelInfo.Text = "Paste the Direct Connection String for Preview endpoint ep-wispy-firefly-b9el08l7:"
        $labelInfo.Font = New-Object System.Drawing.Font("Segoe UI", 9)
        $form.Controls.Add($labelInfo)

        $txtPassword = New-Object System.Windows.Forms.TextBox
        $txtPassword.Location = New-Object System.Drawing.Point(20, 95)
        $txtPassword.Size = New-Object System.Drawing.Size(520, 25)
        $txtPassword.UseSystemPasswordChar = $true
        $txtPassword.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $form.Controls.Add($txtPassword)

        $labelStatus = New-Object System.Windows.Forms.Label
        $labelStatus.Location = New-Object System.Drawing.Point(20, 130)
        $labelStatus.Size = New-Object System.Drawing.Size(520, 20)
        $labelStatus.ForeColor = [System.Drawing.Color]::DarkRed
        $form.Controls.Add($labelStatus)

        $btnSubmit = New-Object System.Windows.Forms.Button
        $btnSubmit.Text = "Run PostgreSQL Tests"
        $btnSubmit.Location = New-Object System.Drawing.Point(180, 175)
        $btnSubmit.Size = New-Object System.Drawing.Size(200, 35)
        $btnSubmit.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)

        $btnCancel = New-Object System.Windows.Forms.Button
        $btnCancel.Text = "Cancel"
        $btnCancel.Location = New-Object System.Drawing.Point(395, 175)
        $btnCancel.Size = New-Object System.Drawing.Size(110, 35)

        $btnSubmit.Add_Click({
            $val = $txtPassword.Text.Trim()
            if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2).Trim() }
            if ($val.StartsWith("'") -and $val.EndsWith("'")) { $val = $val.Substring(1, $val.Length - 2).Trim() }

            if ([string]::IsNullOrWhiteSpace($val)) {
                $labelStatus.Text = "Connection string cannot be empty."
                return
            }
            if (-not ($val -match "^postgres(ql)?://")) {
                $labelStatus.Text = "Invalid format: must start with postgresql:// or postgres://"
                return
            }
            if ($val -match "ep-silent-recipe-b9ahkke2" -or $val -match "silent-recipe" -or $val -match "br-delicate-glitter") {
                $labelStatus.Text = "CRITICAL: Points to Production endpoint ep-silent-recipe-b9ahkke2!"
                return
            }
            if (-not ($val -match "ep-wispy-firefly-b9el08l7")) {
                $labelStatus.Text = "REJECTED: Target must be Preview endpoint ep-wispy-firefly-b9el08l7!"
                return
            }
            if ($val -match "-pooler") {
                $labelStatus.Text = "REJECTED: Pooled connection (-pooler) detected. Use Direct connection."
                return
            }
            $form.Tag = $val
            $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
            $form.Close()
        })

        $btnCancel.Add_Click({
            $form.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
            $form.Close()
        })

        $form.Controls.Add($btnSubmit)
        $form.Controls.Add($btnCancel)
        $form.AcceptButton = $btnSubmit
        $form.CancelButton = $btnCancel

        $form.Add_Shown({
            $form.Activate()
            $form.BringToFront()
            $txtPassword.Focus()
        })

        $result = $form.ShowDialog()
        if ($result -eq [System.Windows.Forms.DialogResult]::OK -and $form.Tag) {
            return $form.Tag
        }
        return $null
    } catch {
        Write-Error "Windows Forms Error: $_"
        return $null
    }
}

$connStr = Get-MaskedCredential

if ([string]::IsNullOrWhiteSpace($connStr)) {
    Write-Host "[!] Verification cancelled by user or empty input." -ForegroundColor Yellow
    exit 1
}

Write-Host "[+] Connection string received securely." -ForegroundColor Green
Write-Host "[+] Launching automated PostgreSQL fix test suite (Atomic ROLLBACK)..." -ForegroundColor Cyan

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $workspace

# Pass connection string via stdin to avoid exposing in environment or arguments
$connStr | node "$workspace\scripts\verify-postgres-bulk-insert-fix.mjs"
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "`n[PASS] All PostgreSQL fix verification tests passed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n[FAIL] Test suite failed with exit code $exitCode." -ForegroundColor Red
}
exit $exitCode
