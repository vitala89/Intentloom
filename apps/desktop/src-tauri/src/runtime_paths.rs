use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct RuntimePaths {
    pub endpoint: PathBuf,
    pub token_file: PathBuf,
    pub token: String,
}
