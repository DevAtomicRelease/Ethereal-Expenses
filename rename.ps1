$files = @(
    "d:\DEV\development\beis-project\beis_mobile\src\api\websocket.ts",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(auth)\login.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(auth)\register.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(onboarding)\welcome.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(tabs)\analytics\index.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(tabs)\expenses\edit.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(tabs)\home\index.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(tabs)\insights\chat.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(tabs)\insights\history.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(tabs)\insights\identity.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(tabs)\profile\batch-import.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(tabs)\profile\data-export.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(tabs)\profile\index.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(tabs)\profile\manage-profile.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(tabs)\profile\thresholds.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\(tabs)\profile\user-profile.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\app\_layout.tsx",
    "d:\DEV\development\beis-project\beis_mobile\src\services\notifications.ts",
    "d:\DEV\development\beis-project\beis_mobile\src\services\offlineQueue.ts",
    "d:\DEV\development\beis-project\beis_mobile\src\types\api.ts",
    "d:\DEV\development\beis-project\beis_mobile\app.json",
    "d:\DEV\development\beis-project\beis_backend\app\routers\chat.py",
    "d:\DEV\development\beis-project\beis_backend\app\main.py",
    "d:\DEV\development\beis-project\beis_backend\app\config.py"
)

foreach ($f in $files) {
    if (Test-Path $f) {
        $c = [System.IO.File]::ReadAllText($f)
        $c = $c -replace 'ATOMICSHIFT MEMBER', 'ETHEREAL MEMBER'
        $c = $c -replace 'ATOMICSHIFT', 'ETHEREAL'
        $c = $c -replace 'AtomicShift Intelligence', 'Ethereal Intelligence'
        $c = $c -replace 'AtomicShift v3\.0', 'Ethereal Expense v3.0'
        $c = $c -replace 'AtomicShift vault', 'Ethereal vault'
        $c = $c -replace 'AtomicShift engines', 'Ethereal engines'
        $c = $c -replace 'AtomicShift web', 'Ethereal Expense'
        $c = $c -replace 'AtomicShift Alerts', 'Ethereal Alerts'
        $c = $c -replace 'AtomicShift User', 'Ethereal User'
        $c = $c -replace 'into AtomicShift', 'into Ethereal Expense'
        $c = $c -replace 'within AtomicShift', 'within Ethereal Expense'
        $c = $c -replace 'of AtomicShift', 'of Ethereal Expense'
        $c = $c -replace 'to AtomicShift', 'to Ethereal Expense'
        $c = $c -replace 'by AtomicShift', 'by Ethereal Expense'
        $c = $c -replace 'AtomicShift suggests', 'Ethereal Expense suggests'
        $c = $c -replace 'called AtomicShift', 'called Ethereal Expense'
        $c = $c -replace 'AtomicShiftWebSocket', 'EtherealWebSocket'
        $c = $c -replace 'AtomicShift', 'Ethereal Expense'
        $c = $c -replace 'atomicshift_offline_queue', 'ethereal_offline_queue'
        $c = $c -replace 'atomicshift_query_cache', 'ethereal_query_cache'
        $c = $c -replace 'com\.atomicshift\.app', 'com.etherealexpense.app'
        $c = $c -replace '"scheme": "atomicshift"', '"scheme": "etherealexpense"'
        $c = $c -replace 'user@atomicshift\.app', 'user@ethereal.app'
        $c = $c -replace 'New to Ethereal Expense\?', 'New here?'
        [System.IO.File]::WriteAllText($f, $c)
        Write-Output "Updated: $f"
    } else {
        Write-Output "NOT FOUND: $f"
    }
}
