-- MySQL dump 10.13  Distrib 8.0.34, for Win64 (x86_64)
--
-- Host: localhost    Database: project
-- ------------------------------------------------------
-- Server version	8.1.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Temporary view structure for view `cours_view`
--

DROP TABLE IF EXISTS `cours_view`;
/*!50001 DROP VIEW IF EXISTS `cours_view`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `cours_view` AS SELECT 
 1 AS `id_relater`,
 1 AS `first_name_stu`,
 1 AS `last_name_stu`,
 1 AS `id_cours`,
 1 AS `cours_name`,
 1 AS `first_cours`,
 1 AS `end_cours`,
 1 AS `date1`,
 1 AS `date2`,
 1 AS `name_teacher`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `cours_view`
--

/*!50001 DROP VIEW IF EXISTS `cours_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `cours_view` AS select `relater`.`id_relater` AS `id_relater`,`student`.`first_name_stu` AS `first_name_stu`,`student`.`last_name_stu` AS `last_name_stu`,`cours`.`id_cours` AS `id_cours`,`cours`.`cours_name` AS `cours_name`,`cours`.`first_cours` AS `first_cours`,`cours`.`end_cours` AS `end_cours`,`cours`.`date1` AS `date1`,`cours`.`date2` AS `date2`,`teacher`.`first_name` AS `name_teacher` from (((`relater` left join `student` on((`relater`.`id_stu` = `student`.`id_stu`))) left join `cours` on((`relater`.`id_cours` = `cours`.`id_cours`))) left join `teacher` on((`relater`.`id_teacher` = `teacher`.`id_teacher`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-25  1:08:48
