IF EXIST .git (
    mklink ".\.git\hooks\pre-commit" "..\..\utils\hooks\pre-commit.local.cmd"
    mklink ".\.git\hooks\post-merge" "..\..\utils\hooks\post-merge.local.cmd"
    echo "Hooks installed"
    exit 0
) ELSE (
  echo ".git directory not found"
  exit 1
)
